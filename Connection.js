"use strict";

var knex = require('knex');

module.exports = function(options) {
	var db = knex(options);
	db.clientName = db.client.config.client;
	
	return db;
};