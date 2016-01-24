"use strict";

var estelle = require('./index.js');
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
	newModel.name = "Nathan";
	newModel.create().then((model) => {
		console.log(model.id);
		MyModel.findById(model.id).then((out) => {
			var returned = new MyModel(out[0], true);
			console.log(returned);
			console.log(returned.id);
		});
	});
});

