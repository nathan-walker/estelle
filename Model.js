"use strict";

var logger = require('winston');
var pluralize = require('pluralize');
var async = require('async');

class Model {
	
	// Standard constructor
	constructor(properties, fromDatabase) {
		
		if (!this.constructor.connection) {
			return this.constructor._newNoConnectionPromise();
		} else {
			this.connection = this.constructor.connection;
		}
		
		// Properties stores the actual data for the schema
		this.properties = new Map();
		
		var schema = this.constructor.schema;
		
		if (properties) {
			Object.keys(properties).forEach((key) => {
				
				if (this.constructor.options.timestamp && (key === 'created' || key === 'updated')) {
					this[key] = Date(properties[key]);
					return;
				}
				
				if (this.constructor.options.safeDelete && key === 'deleted') {
					this.deleted = properties.deleted;
					return;
				}
				
				var type = schema.get(key);
				
				if (!type) {
					return;
				}
				
				var value = properties[key];
				
				if (fromDatabase) {
					var deserializer;
					if (type.deserialize) {
						deserializer = type.deserialize;
					} else if (type.dataType) {
						deserializer = type.dataType.deserialize;
					}
					
					if (typeof deserializer !== 'function') {
						this.properties.set(key, value);
					} else {
						this.properties.set(key, deserializer(value));
					}
				} else {
					this.properties.set(key, value);
				}
			});
		}
		
		// Initialize the various properties
		schema.forEach((value, key) => {
			
			if (!fromDatabase) {
				// Insert any defaults if necessary
				var defaultValue = schema.get(key).defaultValue;
				
				// If a function is provided as a default, call the function
				if (defaultValue && !this.properties.has(key)) {
					if (typeof defaultValue === "function") {
						this.properties.set(key, defaultValue());
					} else {
						this.properties.set(key, defaultValue);
					}
				}
			}
			
			// Create accessors for the properties on the main class
			if (this[key] !== undefined) {
				logger.warn(`${key} is already defined in model ${this.constructor.name}. Be sure to access it through ${this.constructor.name}.properties.${key}.`);
			} else {
				Object.defineProperty(this, key, {
					get: () => this.properties.get(key),
					set: (newValue) => this.properties.set(key, newValue) 
				});
			}
		});
	}
	
	/**
	 * Find a particular record by id, if an id is specified
	 * @param id	a unique id for the object
	 * @return a Promise
	 */
	static findById(id) {
		if (!this.connection) {
			return this._newNoConnectionPromise();
		}
		
		var query = this.connection.select().from(this.tableName).where({ id: id });
		
		if (!this.connection.production) {
			this._logQuery(query);
		}
		
		return query.then((res) => {
			if (res.length > 0) {
				if (!this.options.safeDelete || res[0].deleted === 'false' || !res[0].deleted) {
					return new this(res[0], true);
				} else {
					return null;
				}
			} else {
				return null;
			}
		});
	}
	
	// TODO: filter out any safe deleted
	
	/**
	 * Find any entries that match the following criteria
	 * @param where		an object that describes any conditions for the query
	 * @return a Promise
	 */
	
	static findWhere(where) {
		var query = this.connection.select().from(this.tableName).where(where);
		
		return this.findQuery(query);
	}
	
	/**
	 * Find all records in a specific table
	 * @return a Query object
	 */
	static findAll() {
		
		var query = this.connection.select().from(this.tableName);
		
		return this.findQuery(query);
	}
	
	/**
	 * Converts an arbitrary SELECT query into an array of objects
	 * @param query - A knex query object
	 * @return Promise -> Model[]
	 */
	static findQuery(query) {
		if (!this.connection) {
			return this._newNoConnectionPromise();
		}
				
		if (!this.connection.production) {
			this._logQuery(query);
		}
		
		return query.then((res) => {
			var out = [];
			res.forEach((obj) => {
				if (!this.options.safeDelete || obj.deleted === 'false' || !obj.deleted) {
					out.push(new this(obj, true));
				}	
			});
			return out;
		});
	}
	
	/**
	 * Creation class methods
	 */
	
	/**
	 * Create a new record in the database
	 * 
	 * @param properties	a JS Map of properties for the object
	 * @return a Promise returning an instance of the model
	 */
	static create(properties) {
		if (!this.connection) {
			return this._newNoConnectionPromise();
		}
		
		var model = new this(properties);
		return model.create().then(function() {
			// TODO: check if create was successful
			return model;
		});
	}
	
	/**
	 * If a record exists in the database, update it.
	 * If the record does not exist, create a new one.
	 * @param properties	a JS object of properties for the object
	 * @return an Operation object
	 */
	static createOrUpdate(properties) {
		if (!this.connection) {
			return this._newNoConnectionPromise();
		}
		
		var model = new this(properties);
		return model.createOrUpdate().then(function() {
			return model;
		});
	}
	
	/**
	 * Return an object that can perform raw Knex queries
	 * @return Knex object
	 */
	static get raw() {
		return this.connection;
	}
	
	/**
	 * Static Utility methods
	 */
	
	/**
	 * Get the name that should represent this model in the database
	 * @return the name of the table as a string
	 */
	static get tableName() {
		
		if (typeof this.options.tableName === "string") {
			return this.options.tableName;
		}
		
		return pluralize(this.name).toLowerCase();
	}
	
	/**
	 * Create a Promise that immediately provides an error for no
	 * available connection
	 */
	static _newNoConnectionPromise() {
		return new Promise(
			(resolve, reject) => {
				var err = new Error("No connection available");
				err.type = "estelle.no-connection";
				logger.error("Model objects must have Model.connection defined.");
				reject(err);
			}
		);
	}
	
	static _newErrorPromise(err) {
		return new Promise(
			(resolve, reject) => {
				logger.error(err.message);
				reject(err);
			}
		);
	}
	
	/**
	 * Writes a query to the log
	 */
	static _logQuery(query) {
		logger.info(query.toString());
	}
	
	/**
	 * Initializes the table in the database
	 * @param whether or not to create the DB tables as well
	 */
	static initialize(initDB) {
		if (!this.connection) {
			return this._newNoConnectionPromise();
		}
		
		// On first model init, add all required keys to an option
		
		if (this.required === undefined) {
			var required = new Set();
			this.schema.forEach((value, key) => {
				if (value.required === true ||
				this.options.primaryKey === key ||
				(this.options.compositePrimaryKey &&
				this.options.compositePrimaryKey.indexOf(key) !== -1)) {
					required.add(key);
				}
			});
			
			this.required = required;
		}
		
		if (this.primaries === undefined) {
			let primaries = new Set();
			
			if (this.options.primaryKey) {
				primaries.add(this.options.primaryKey);
			} else if (this.options.compositePrimaryKey) {
				for (let key of this.options.compositePrimaryKey) {
					primaries.add(key);
				}
			}
			
			this.primaries = primaries;
		}
		
		if (initDB) {
			return this.connection.schema.createTableIfNotExists(this.tableName, (table) => {
				this.schema.forEach((type, key) => {
					var typeVal;
					if (type.types) {
						typeVal = type.types[this.connection.clientName];
					} else if (type.dataType) {
						typeVal = type.dataType.types[this.connection.clientName];
					}
					
					if (!typeVal) {
						var err = new Error();
						err.type = "estelle.schema.noColumnType";
						err.message = `Column type is not defined for ${this.name}.${key}.`;
						throw err;
					}
					
					var column = table.specificType(key, typeVal);
					
					if (this.required.has(key)) {
						column.notNullable();
					}
					if (this.options.primaryKey === key) {
						column.primary();
					}
				});
				
				if (this.options.timestamp) {
					if (this.connection.clientName === 'pg') {
						table.specificType("created", "timestamp");
						table.specificType("updated", "timestamp");
					} else {
						table.specificType("created", "datetime");
						table.specificType("updated", "datetime");
					}
				}
				
				if (this.options.safeDelete) {
					table.specificType("deleted", "boolean").notNullable().defaultTo(false);
				}
				
				if (this.options.compositePrimaryKey) {
					table.primary(this.options.compositePrimaryKey);
				}
			});
		} else {
			return Promise.resolve();
		}
		
	}
	
	/** 
	 * Instance methods
	 */
	
	/**
	 * Creation instance methods
	 */
	
	/**
	 * Create a new record in the database.
	 * @return a Knex promise
	 */
	create() {
		// Validate the object
		var validationError = new Error();
		
		if (!this.validate(validationError)) {
			return this.constructor._newErrorPromise(validationError);
		}
		
		// Serialize for use in the database
		var properties = this.serialize();
		
		// Add timestamps
		if (this.constructor.options.timestamp) {
			properties.created = new Date().toISOString();
			properties.updated = new Date().toISOString();
		}
		
		// Insert into the database
		var query = this.connection(this.constructor.tableName).insert(properties);
		this.constructor._logQuery(query);
		
		return query;
		
		/*return query.then((ids) => {
			if (ids.length === 1) {
				return this;
			}
			
			var err = new Error();
			err.type = "estelle.sql.insertion";
			err.message = `Error inserting ${this.id} into the database for ${this.constructor.tableName}.`;
			throw err;
		});*/
	}
	
	/**
	 * If a record exists in the database, update it.
	 * If the record does not exist, create a new one.
	 * 
	 * NOTE: this function can be a bit risky with defaultValues, so be careful!
	 * @return a Knex promise
	 */
	createOrUpdate() {
		// Validate the object
		var validationError = new Error();
		
		if (!this.validate(validationError)) {
			return this.constructor._newErrorPromise(validationError);
		}
		
		// Serialize for use in the database
		var properties = this.serialize();
		
		// Add timestamps
		if (this.constructor.options.timestamp) {
			properties.created = new Date().toISOString();
			properties.updated = new Date().toISOString();
		}
		
		// Insert into the database
		var query = this.connection(this.constructor.tableName).insert(properties).toString();
		delete properties.created;
		var updateQuery = this.connection.update(properties).toString();
		
		switch (this.connection.clientName) {
			case "pg":
				// TODO test this!
				query += " on conflict do " + updateQuery;
				query += "";
				query = this.connection.raw(query);
				break;
			default:
				var err = new Error("createOrUpdate is not supported for " + this.connection.clientName);
				err.type = "estelle.unsupportedOperation";
				return Promise.reject(err);
		}
		
		query = this.connection.raw(query);
		
		this.constructor._logQuery(query);
		return query;
	}
	
	/**
	 * Update methods
	 */
	
	/**
	 * Push any updates made to the object to the database
	 * @return a Knex promise
	 */
	
	// TODO: do something with safeDelete
	update() {
		// Validate the object
		var validationError = new Error();
		
		if (!this.validate(validationError)) {
			return this.constructor._newErrorPromise(validationError);
		}
		
		// Serialize for use in the database
		var properties = this.serialize();
		
		// Add timestamp
		if (this.constructor.options.timestamp) {
			properties.updated = new Date().toISOString();
		}
		
		// Use the appropriate keys to search
		var searchObject = {};
		for (let key of this.constructor.primaries) {
			if (properties[key]) {
				searchObject[key] = properties[key];
			}
		}
		
		// Insert into the database
		var query = this.connection(this.constructor.tableName).where(searchObject).update(properties);
		this.constructor._logQuery(query);
		return query;
	}
	
	/**
	 * Delete an object from the database
	 * @return an Operation object
	 */
	delete() {
		
		// Use the appropriate keys to search
		var searchObject = {};
		for (let key of this.constructor.primaries) {
			if (this[key]) {
				searchObject[key] = this[key];
			}
		}
		
		var query;
		
		if (this.constructor.options.safeDelete) {
			var properties = {};
			
			// Add timestamp
			if (this.constructor.options.timestamp) {
				properties.updated = new Date().toISOString();
			}
			
			properties.deleted = true;
			
			query = this.connection(this.constructor.tableName).where(searchObject).update(properties);
		} else {
			query = this.connection(this.constructor.tableName).where(searchObject).del();
		}
		
		this.constructor._logQuery(query);
		return query;
	}
	
	/**
	 * Instance Utilties
	 */
	
	/**
	 * Validates the current instance based on the parent schema
	 * @param err	An empty error object for storing possible errors
	 * @return boolean - false if the schema is invalid, true if the schema is valid
	 */
	validate(err) {
		var model = this.constructor;
		var schema = model.schema;
		var prop = this.properties;
		
		prop.forEach((value, key) => {
			
			var type = schema.get(key);
			
			// Check if the key is in the schema
			if (!type) {
				err.type = "estelle.validation.unrecognizedKey";
				err.message = `${key} is not in the schema for ${model.name}.`;
				return false;
			}
			
			// Check that the key returns a supported type
			var supportedTypes;
			if (type.supportedTypes) {
				supportedTypes = type.supportedTypes;
			} else if (type.dataType) {
				supportedTypes = type.dataType.supportedTypes;
			}
			
			if (supportedTypes) {
				if (!supportedTypes.has(typeof value)) {
					err.type = "estelle.validation.unacceptedType";
					err.message = `${typeof value} is not an accepted type for ${key} (type: ${type.name}) in ${model.name}.`;
					return false;
				}
			}
			
			// Check in with the validation function
			var validate;
			if (type.validator) {
				validate = type.validator;
			} else if (type.dataType) {
				validate = type.dataType.validator;
			}
			if (typeof validate !== 'function') {
				err.type = "estelle.validation.noValidator";
				err.message = `${key} in ${model.name} does not have a valid validation function.`;
				return false;
			} 
			
			if (!validate(value)) {
				err.type = "estelle.validation.validationFailed";
				err.message = `${value} is not a valid value for ${model.name}.${key}.`;
				return false;
			}
		});
		
		// Check to see if any required values are missing
		for (let item of model.required) {
			if (!prop.has(item)) {
				err.type = "estelle.validation.missingRequired";
				err.message = `${item} is required in ${model.name}.`;
				return false;
			}
		}
		
		// If we reach this point, then validation passed
		return true;
	}
	
	/**
	 * Converts the internal property scheme into something
	 * the database layer can understand
	 * 
	 * Serialize generally operates under the assumption that
	 * validate() has already been executed
	 * 
	 * @return a JS object with all of the necessary properties
	 */
	serialize() {
		var prop = this.properties;
		var schema = this.constructor.schema;
		
		var out = {};
		
		prop.forEach((value, key) => {
			var type = schema.get(key);
			
			var serializer;
			if (type.serialize) {
				serializer = type.serialize;
			} else if (type.dataType) {
				serializer = type.dataType.serialize;
			}
			
			if (typeof serializer !== 'function') {
				out[key] = value;
			} else {
				out[key] = serializer(value);
			}
		});
		
		return out;
	}
	
	/**
	 * Converts the object's properties to a standard JS object
	 * @return JS object with the properties
	 */
	toObject() {
		var out = {};
		
		this.properties.forEach((v, k) => {
			out[k] = v;
		});
		
		return out;
	}
}

/**
 * A set of global options for the model.
 * Should NOT be modified at runtime
 * 
 * Please create a new object for each new model,
 * otherwise you will modifying global settings
 */
Model.options = {
	// If true, the rows will only be marked deleted instead of actually removed
	safeDelete:	true,
	
	// Automatically add timestamps for update and creation times
	timestamp: true,
	
	// The name of the table in the database
	// If not set, the name will be automatically generated
	tableName: undefined,
	
	// The primary key for the database, implied required
	primaryKey: undefined,
	
	// An array of keys, if a composite primary key is desired
	compositePrimaryKey: undefined
};

/**
 * The schema for the data model
 * Represented as a JS Map where the property name is the key,
 * and the value is the type from DataTypes
 * 
 * Alternatively, the value can be an object with the following options:
 * dataType: the type from DataTypes
 * defaultValue: the default value of the field
 * validator: a special validation function for this field (returns false if bad)
 * required: whether or not this is necessary
 * primaryKey: true if this is the primaryKey
 */
Model.prototype.schema = new Map();

module.exports = Model;