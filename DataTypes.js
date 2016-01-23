module.exports = {
	STRING: {
		name: "str",
		types: {
			postgres: "TEXT",
			mysql: "TEXT",
			sqlite3: "TEXT"
		},
		validator: () => true,
		defaultValue: "hello"
	},
	
	INTEGER: {
		name: "int"
	},
	
	DATETIME: {
		name: "dtime"
	}
};