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
MyModel.schema.set("id", estelle.DataTypes.STRING);
MyModel.options.timestamp = false;
console.log(MyModel.tableName);

MyModel.initialize().then(function() {
	var newModel = new MyModel();
	newModel.create().then();
});

