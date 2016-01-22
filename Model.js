"use strict";

var log = require('winston');
var pluralize = require('pluralize');

class Model {
	
	// Standard constructor
	constructor(useDefaults) {
		// Properties stores the actual data for the schema
		this.properties = {};
		
		var schema = this.constructor.schema;
		
		// Initialize the various properties
		Object.keys(schema).forEach((key) => {
			
			if (useDefaults) {
				// Insert any defaults if necessary
				var defaultValue = schema[key].defaultValue;
				
				// If a function is provided as a default, call the function
				if (defaultValue) {
					if (typeof defaultValue === "function") {
						this.properties[key] = defaultValue();
					} else {
						this.properties[key] = defaultValue;
					}
				}
			}
			
			// Create accessors for the properties on the main class
			if (this.key !== undefined) {
				log.warn(`${key} is already defined in model ${this.constructor.name}. Be sure to access it through ${this.constructor.name}.properties.${key}.`);
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
	 * @return a Query object
	 */
	static findById(id) {
		// TODO: Implement findById
	}
	
	/**
	 * Find all records in a specific table
	 * @return a Query object
	 */
	static findAll() {
		// TODO: Implement findAll
	}
	
	/**
	 * Creation class methods
	 */
	
	/**
	 * Create a new record in the database.
	 * @param properties	a JS object of properties for the object
	 * @return an Operation object
	 */
	static create(properties) {
		// TODO: implement create
	}
	
	/**
	 * If a record exists in the database, update it.
	 * If the record does not exist, create a new one.
	 * @param properties	a JS object of properties for the object
	 * @return an Operation object
	 */
	static createOrUpdate(properties) {
		// TODO: implement createOrUpdate
	}
	
	/**
	 * Creation instance methods
	 */
	
	/**
	 * Create a new record in the database.
	 * @return an Operation object
	 */
	create() {
		// TODO: implement create
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
		// TODO: implement update
	}
	
	/**
	 * Delete an object from the database
	 * @return an Operation object
	 */
	delete() {
		// TODO: implement delete
	}
	
	/**
	 * Utility methods
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
 * Represented as a JS object where the property name is the key,
 * and the value is the type from DataTypes
 * 
 * Alternatively, the value can be an object with the following options:
 * dataType: the type from DataTypes
 * defaultValue: the default value of the field
 * validator: a special validation function for this field (returns false if bad)
 */
Model.schema = {};

module.exports = Model;