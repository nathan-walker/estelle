var uuid = require('node-uuid');

// Via stackOverflow: http://stackoverflow.com/questions/19989481/how-to-determine-if-a-string-is-a-valid-v4-uuid
const validUuid = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

module.exports = {
	STRING: {
		types: {
			pg: "TEXT",
			mysql: "TEXT",
			sqlite3: "TEXT"
		},
		validator: (value) => typeof value === 'string'
	},
	
	INTEGER: {
		types: {
			pg: "integer",
			mysql: "int",
			sqlite3: "int"
		},
		validator: (value) => typeof value === 'number'
	},
	
	DATETIME: {
		types: {
			pg: "timestamp",
			mysql: "datetime",
			sqlite3: "datetime"
		},
		validator: (value) => value instanceof Date,
		deserialize: (value) => new Date(value)
	},
	
	UUID: {
		types: {
			pg: "uuid",
			mysql: "char(36)",
			sqlite3: "character(36)"
		},
		validator: (value) => validUuid.test(value),
		defaultValue: uuid.v4
	}
};