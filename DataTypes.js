module.exports = {
	STRING: {
		name: "str",
		types: {
			postgres: (value) => "TEXT",
			mysql: (value) => "TEXT",
			sqlite3: (value) => "TEXT"
		},
		validator: () => true
	},
	
	INTEGER: {
		name: "int"
	},
	
	DATETIME: {
		name: "dtime"
	}
};