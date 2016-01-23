"use strict";

var logger = require('winston');
var pluralize = require('pluralize');

class Model {
	
	// Standard constructor
	constructor(properties, noDefaults) {
		
		if (!this.constructor.connection) {
			return this._newNoConnectionPromise();
		} else {
			this.connection = this.constructor.connection;
		}
		
		// On first model init, add all required keys to an option
		var schema = this.constructor.schema;
		
		if (this.constructor.required === undefined) {
			var required = new Set();
			schema.forEach((value, key) => {
				if (value.required === true || value.primaryKey === true) {
					required.add(key);
				}
			});
			
			this.constructor.required = required;
		}
		
		// Properties stores the actual data for the schema
		this.properties = properties || new Map();
		
		// Initialize the various properties
		schema.forEach((value, key) => {
			
			if (!noDefaults) {
				// Insert any defaults if necessary
				var defaultValue = schema.get(key).defaultValue;
				
				// If a function is provided as a default, call the function
				if (defaultValue && !this.properties.has("key")) {
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
					get: () => this.properties[key],
					set: (newValue) => { this.properties[key] = newValue; }
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
		if (!this.connection) return this._newNoConnectionPromise();
		
		var query = this.connection.select().from(this.tableName).where({ id: id });
		
		if (!this.connection.production) this._logQuery(query);
		
		return query;
	}
	
	/**
	 * Find all records in a specific table
	 * @return a Query object
	 */
	static findAll() {
		if (!this.connection) return this._newNoConnectionPromise();
		
		var query = this.connection.select().from(this.tableName);
		
		if (!this.connection.production) this._logQuery(query);
		
		return query;
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
		if (!this.connection) return this._newNoConnectionPromise();
		
		var model = new this();
		return model.create(properties).then(function() {
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
		if (!this.connection) return this._newNoConnectionPromise();
		
		var model = new this();
		return model.createOrUpdate(properties).then(function() {
			return model;
		});
	}
	
	/**
	 * Static Utility methods
	 */
	
	/**
	 * Get the name that should represent this model in the database
	 * @return the name of the table as a string
	 */
	static get tableName() {
		// Lazy-load the table name
		delete this.tableName;
		
		if (typeof this.options.tableName === "string") {
			return this.tableName = this.options.tableName;
		}
		
		return this.tableName = pluralize(this.name).toLowerCase();
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
			properties.created = Date.now();
			properties.updated = Date.now();
		}
		
		// Insert into the database
		return this.connection(this.constructor.tableName).insert(properties);
	}
	
	/**
	 * If a record exists in the database, update it.
	 * If the record does not exist, create a new one.
	 * @return an Operation object
	 */
	createOrUpdate() {
		// TODO: implement createOrUpdate
	}
	
	/**
	 * Update methods
	 */
	
	/**
	 * Push any updates made to the object to the database
	 * @return an Operation object
	 */
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
			properties.updated = Date.now();
		}
		
		// Insert into the database
		return this.connection(this.constructor.tableName).where('id', this.id).update(properties);
	}
	
	/**
	 * Delete an object from the database
	 * @return an Operation object
	 */
	delete() {
		if (this.constructor.options.safeDelete) {
			var properties = {};
			
			// Add timestamp
			if (this.constructor.options.timestamp) {
				properties.updated = Date.now();
			}
			
			properties.deleted = true;
			
			return this.connection(this.constructor.tableName).where('id', this.id).update(properties);
		} else {
			return this.connection(this.constructor.tableName).where('id', this.id).del();
		}
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
		
		for (let [key, value] of prop) {
			
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
		}
		
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
		
		for (let [key, value] of prop) {
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
		}
		
		return out;
	}
}

/**
 * A set of global options for the model.
 * Should NOT be modified at runtime
 */
Model.options = {
	// If true, the rows will only be marked deleted instead of actually removed
	safeDelete:	true,
	
	// Automatically add timestamps for update and creation times
	timestamp: true,
	
	// The name of the table in the database
	// If not set, the name will be automatically generated
	tableName: undefined,	
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
Model.schema = new Map();

module.exports = Model;