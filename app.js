const express = require('express');
const config = require('config');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const path = require('path')
const uploadRoute = require('./routes/upload');
const homeRoute = require('./routes/home');

const app = express();
const PORT = config.get('port') || 3000;

const hbs = exphbs.create({
    defaultLayout: 'main',
    extname: 'hbs'
})

app.engine('hbs', hbs.engine) // Регистрируем движок
app.set('view engine', 'hbs') // Используем его
app.set('views', 'views')

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(fileUpload({
    createParentPath: true
}));

app.use('/polygons', uploadRoute);
app.use('/', homeRoute);

const start = async () => {
    try {
        app.listen(PORT, () => {
            console.info(`App has been started on port ${PORT}`);
        });
    } catch (e) {
        console.log('Server error', e.message);
        process.exit(1);
    }
};

start();