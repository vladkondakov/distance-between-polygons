const Point = require('../model');
const path = require('path')
const fs = require('fs');

const p = path.join(
    path.dirname(require.main.filename),
    'data',
    'polygons.json'
)

const p1 = path.join(
    path.dirname(require.main.filename),
    'data',
    'minksum.json'
)

const getUploadPage = (req, res) => {
    res.render('upload', {
        title: "Загрузка файла",
        isUpload: true
    })
}

// in the form:   <input name="inputFile" type="file" />
const uploadFileData = async (req, res) => {
    try {
        if (!req.files) {
            res.send({
                status: false,
                message: "No file uploaded"
            });
        } else {
            const file = req.files.inputFile;
            file.mv('./uploads/' + file.name);
            let data = file.data.toString('utf-8');

            const lines = data.split(/\r\n|\r|\n/);

            const n = parseInt(lines[0][0]);
            const m = parseInt(lines[0][2]);
    
            let firstPolygon = [];
            let secondPolygon = [];
            let i = 1; // Current index of line
    
            const addPoint = (lineWithCoords, polygon) => {
                const coords = lineWithCoords.split(' ');
                const xCoord = parseInt(coords[0]);
                const yCoord = parseInt(coords[1]);
                polygon.push(new Point(xCoord, yCoord));
            }
    
            for (i; i <= n; i++) {
                addPoint(lines[i], firstPolygon);
            }
    
            for (i; i <= n + m; i++) {
                addPoint(lines[i], secondPolygon);
            }
            
            const polygons = {
                firstPolygon,
                secondPolygon
            };

            fs.writeFile(p, JSON.stringify(polygons), err => {
                if (err) {
                    res.send("Something wrong in writing to file");
                } 
            });
            res.redirect('/polygons');
            res.send({
                status: true,
                message: 'File data was read',
                data
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
};

const getPolygons = (req, res) => {
    try {
        fs.readFile(p, 'utf-8', (err, content) => {
            if (err) {
                res.send("Can't read")
            } else {
                const polygons = JSON.parse(content);
                
                res.render('polygons-visual', {
                    firstPolygon: JSON.stringify(polygons.firstPolygon, null, '\t'),
                    secondPolygon: JSON.stringify(polygons.secondPolygon, null, '\t'),
                    isPolygons: true
                })
            }
        });
    } catch (err) {
        res.status(500).send(err);
    }
};

const getMinkSum = (req, res) => {  
    try {
        const content = JSON.parse(fs.readFileSync(p, 'utf-8'));

        const inversePolygon = (polygon) => {
            return polygon.map((point) => new Point(-point.x, -point.y));
        }

        let { firstPolygon, secondPolygon } = content;

        secondPolygon = inversePolygon(secondPolygon);

        const n = firstPolygon.length;
        const m = secondPolygon.length;
        let checkedPoints1 = new Array(n + m);
        let checkedPoints2 = new Array(n + m);

        let j = function leftBottomPointIndex(polygon) {
            let resPoint = new Point(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
            let index = 0
            for (let i = 0; i < polygon.length; i++) {
                let point = polygon[i]
                if ((point.y < resPoint.y) || (point.y == resPoint.y && point.x < resPoint.x)) {
                    resPoint = Object.assign(new Point, point)
                    index = i
                }
            }
            return index
        }(secondPolygon);

        let i = 0;

        firstPolygon.push(new Point(firstPolygon[0].x, firstPolygon[0].y));
        secondPolygon.push(new Point(secondPolygon[0].x, secondPolygon[0].y));

        secondPolygon.slice(0, j + 1).forEach(point => secondPolygon.push(point))

        let minkSum = [];
        minkSum.push(new Point(firstPolygon[0].x + secondPolygon[j].x, firstPolygon[0].y + secondPolygon[j].y))

        const addPoint = (point1, point2) => {
            len = minkSum.length
            minkSum.push(new Point(minkSum[len - 1].x + (point2.x - point1.x), minkSum[len - 1].y + (point2.y - point1.y)));
        }

        while (!(checkedPoints1[i] && checkedPoints2[j])) {
            if (i == n) { i = 0; }
            if (j == m) { j = 0; }
            if (checkedPoints1[i] || !checkedPoints2[j] &&
                (firstPolygon[i + 1].x - firstPolygon[i].x) * (secondPolygon[j + 1].y - secondPolygon[j].y) -
                (firstPolygon[i + 1].y - firstPolygon[i].y) * (secondPolygon[j + 1].x - secondPolygon[j].x) < 0) {
                addPoint(secondPolygon[j], secondPolygon[j + 1]);
                checkedPoints2[j] = true;
                j++;
            } else {
                addPoint(firstPolygon[i], firstPolygon[i + 1]);
                checkedPoints1[i] = true;
                i++;
            }
        }

        fs.writeFile(p1, JSON.stringify(minkSum), err => {
            if (err) {
                res.send("Something wrong in writing to file");
            } 
        });

        res.render('minksum-visual', { 
            minkSum: JSON.stringify(minkSum, null, '\t'),    
            isMinkSum: true
        });
    } catch (err) {
        res.status(500).send(err);
    }
};

const getDistance = (req, res) => {
    try {
        const minkSum = JSON.parse(fs.readFileSync(p1, 'utf-8'));

        const zVectMult = (point1, point2, point3) => {
            return (point2.x - point1.x) * (point3.y - point2.y) - (point2.y - point1.y) * (point3.x - point2.x);
        }

        const nullPoint = new Point(0, 0)
        let distance = Number.MAX_VALUE;

        if (!(zVectMult(minkSum[0], minkSum[1], nullPoint) < 0 || zVectMult(minkSum[0], minkSum[minkSum.length - 1], nullPoint) > 0)) {
            let left = 1;
            let right = minkSum.length - 1;
            let middle;
    
            while (right - left > 1) {
                middle = parseInt((right + left) / 2);
                if (zVectMult(minkSum[0], minkSum[middle], nullPoint) < 0) {
                    right = middle;
                } else {
                    left = middle;
                }
            }
    
            const areCrossed = function (point1, point2, point3, point4) {
                return (zVectMult(point1, point2, point3) * zVectMult(point1, point2, point4) < 0 &&
                    zVectMult(point3, point4, point1) * zVectMult(point3, point4, point2) < 0)
            }(minkSum[0], nullPoint, minkSum[left], minkSum[right]);
    
            if (!areCrossed) {
                distance = 0;
                return res.send({
                    "info": "Lines are crossed", 
                    distance: 0 
                });
            }
        }

        const isObtuse = (vector1, vector2) => (vector1.x * vector2.x + vector1.y * vector2.y <= 0);
        const vectorModule = (vector) => Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        let curDistance = 0;

        for (let i = 0; i < minkSum.length - 1; i++) {
            point1 = minkSum[i]
            point2 = minkSum[i + 1]
            let vector1 = new Point(point1.x - point2.x, point1.y - point2.y);
            let vector2 = new Point(-point2.x, -point2.y);
            let vector3 = new Point(-vector1.x, -vector1.y);
            let vector4 = new Point(-point1.x, -point1.y);

            if (isObtuse(vector1, vector2) || isObtuse(vector3, vector4)) {
                curDistance = Math.min(vectorModule(point1), vectorModule(point2));
            } else {
                curDistance = Math.abs(point2.x * point1.y - point2.y * point1.x) /
                    Math.sqrt((point2.y - point1.y) * (point2.y - point1.y) + (point2.x - point1.x) * (point2.x - point1.x));
            }

            if (curDistance < distance) {
                distance = curDistance;
            }
        }

        console.info({
            "route": "GET /polygons/distance",
            "status": "success", 
            distance 
        })
        
        res.render('distance', {
            distance,
            isDistance: true
        })
    } catch (err) {
        res.status(500).send(err);
    }
}


module.exports = {
    uploadFileData,
    getPolygons,
    getMinkSum,
    getDistance,
    getUploadPage
}