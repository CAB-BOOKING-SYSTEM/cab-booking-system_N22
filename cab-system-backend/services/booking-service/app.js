// app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./src/utils/error.handler');

class App {
  constructor(bookingRoutes) {
    this.app = express();
    this.bookingRoutes = bookingRoutes;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }
  
  initializeMiddlewares() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('dev'));
  }
  
  initializeRoutes() {
    this.app.use('/', this.bookingRoutes);
  }
  
  initializeErrorHandling() {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }
  
  async connectDatabase() {
    try {
      await mongoose.connect(config.mongodb.uri, {
        dbName: config.mongodb.dbName,
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      throw error;
    }
  }
  
  getApp() {
    return this.app;
  }
}

module.exports = App;