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
		deserialize: (value) => new Date(value),
		serialize: (value) => value.toISOString()
	},
	
	UUID: {
		types: {
			pg: "uuid",
			mysql: "char(36)",
			sqlite3: "character(36)"
		},
		validator: (value) => validUuid.test(value),
		defaultValue: uuid.v4
	},
	
	BOOLEAN: {
		types: {
			pg: "boolean", 
			mysql: "boolean",
			sqlite3: "boolean"
		},
		validator: (value) => typeof value === 'boolean',
		serialize: (value) => {
			if (value) {
				return 1;
			} else {
				return 0;
			}
		},
		deserialize: (value) => {
			if (value === 'false') {
				return 0;
			} else {
				return Boolean(value);
			}
		}
	},
	
	VARCHAR: function(number) {
		return {
			types: {
				pg: `varchar(${number})`,
				mysql: `varchar(${number})`,
				sqlite3: `varchar(${number})`
			},
			validator: (value) => typeof value === 'string' && value.length <= number
		};
	},
	
	CHAR: function(number) {
		return {
			types: {
				pg: `char(${number})`,
				mysql: `char(${number})`,
				sqlite3: `char(${number})`
			},
			validator: (value) => typeof value === 'string' && value.length === number
		};
	},
	
	JSON: {
		types: {
			pg: "jsonb",
			mysql: "text",
			sqlite3: "text"
		},
		validator: (value) => typeof value === "object",
		serialize: (value) => {
			return JSON.stringify(value);
		},
		deserialize: (value) => {
			// PG returns a value that doesn't need to be deserialized
			if (typeof value === 'object') {
				return value;
			}
			try {
				return JSON.parse(value);
			} catch (e) {
				return undefined;
			}
		}
	}
};