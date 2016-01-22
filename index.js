"use strict";

var Connection = require('./Connection');

module.exports = {
	Model: require("./Model"),
	DataTypes: require("./DataTypes"),
	connect: (options) => {
		module.exports.connection = Connection(options);
	}
};