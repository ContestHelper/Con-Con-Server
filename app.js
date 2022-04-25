var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var accountRouter = require('./routes/account');
var contestRouter = require('./routes/contest');
var participantRouter=require('./routes/participant');
var profileRouter=require('./routes/profile');
var prizeRouter = require('./routes/prize');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname,'public')));
app.use(cors());

const{swaggerUi, specs} = require('./swagger/swagger');
app.use('/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(specs));

app.use('/', accountRouter);
app.use('/contest', contestRouter);
app.use('/participant',participantRouter);
app.use('/profile',profileRouter);
app.use('/prize',prizeRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.error(err);
  res.json({
    status:res.statusCode,
    msg:"대부분은 서버 오류.",
    data:err
  });
  // res.render('error');
});

module.exports = app;
