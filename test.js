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
MyModel.schema.set("settings", estelle.DataTypes.JSON);
MyModel.options.timestamp = true;
MyModel.options.compositePrimaryKey = ["id", "name"];
console.log(MyModel.tableName);

MyModel.initialize().then(function() {
	var newModel = new MyModel();
	
	newModel.name = "Nathan";
	newModel.dob = new Date("1984-01-24 00:00:00 -0500");
	newModel.settings = {a: "B"};
	newModel.create().then(() => {
		var model = newModel;
		console.log(model.id);
		MyModel.findById(model.id).then((out) => {
			console.log(out);
			console.log(out.id);
		});
	});
	
	MyModel.findById("ec096db1-5f2a-4e11-a74c-85075a12856f").then((doc) => {
		console.log(doc.name);
		doc.delete().then();
	});
	
	MyModel.findAll().then(function(models) {
		models.forEach((obj) => logger.info(obj.id + obj.name));
	});
	
	MyModel.createOrUpdate({
		id: "ec096db1-5f2a-4e11-a74c-85075a12856f",
		name: "Tim"
	}).then((model) => {
		debugger;
	});
});

