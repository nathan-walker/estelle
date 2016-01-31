"use strict";

var estelle = require('./index.js');
var logger = require('winston');
var Model = estelle.Model;

var db = estelle.connect({
	client: 'sqlite3',
	connection: {
		filename: 'test.db'
	}
});

class MyModel extends Model {
	
}

MyModel.connection = db;
MyModel.schema = new Map();
MyModel.schema.set("id", estelle.DataTypes.UUID);
MyModel.schema.set("name", estelle.DataTypes.STRING);
MyModel.schema.set("dob", estelle.DataTypes.DATETIME);
MyModel.options.timestamp = true;
MyModel.options.primaryKey = "id";
console.log(MyModel.tableName);

MyModel.initialize().then(function() {
	var newModel = new MyModel();
	newModel.name = "Steve";
	newModel.dob = new Date("1984-01-24 00:00:00 -0500");
	newModel.create().then((model) => {
		console.log(model.id);
		MyModel.findById(model.id).then((out) => {
			console.log(out);
			console.log(out.id);
		});
	});
	
	MyModel.findById("86933edd-3810-4b4b-be07-9155fb5603d8").then((doc) => {
		console.log(doc.name);
		doc.delete().then();
	});
	
	MyModel.findAll().then(function(models) {
		models.forEach((obj) => logger.info(obj.id + obj.name));
	});
});

