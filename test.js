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
// MyModel.options.timestamp = true;
console.log(MyModel.tableName);

MyModel.initialize().then(function() {
	var newModel = new MyModel();
	newModel.name = "Paul";
	newModel.create().then((model) => {
		console.log(model.id);
		MyModel.findById(model.id).then((out) => {
			console.log(out);
			console.log(out.id);
		});
	});
	
	MyModel.findById("782edc35-bcd8-4999-8692-45d79456d5d0").then((doc) => {
		console.log(doc.name);
	});
	
	MyModel.findAll().then(function(models) {
		models.forEach((obj) => logger.info(obj.id + obj.name));
	});
});

