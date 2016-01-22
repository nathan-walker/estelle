"use strict";

var Connection = require('./Connection');

module.exports = {
	Model: require("./Model"),
	DataTypes: require("./DataTypes"),
	connect: (options) => {
		var connection = Connection(options);
		return connection;
	}
};