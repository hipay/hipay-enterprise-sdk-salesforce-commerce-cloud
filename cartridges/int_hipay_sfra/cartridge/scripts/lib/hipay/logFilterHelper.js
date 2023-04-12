const System = require('dw/system/System');

/**
 * Loops through a JSON object and executes a function for each of its elements
 * @param {*} o The JSON Object
 * @param {*} func The function to be called on each element
 */
function traverse(o, func) {
    Object.keys(o).forEach(function (i) {
        func.apply(this, [o, i, o[i]]);
        if (o[i] !== null && typeof o[i] === "object") {
            traverse(o[i], func);
        }
    });
}

/**
 * Filters a string value inside a JSON object
 * @param {*} obj The parent JSON object that holds this element
 * @param {*} key The name of the element inside the parent JSON object
 * @param {*} value the value to be filtered
 */
function filterChildStrings(obj, key, value) {
    if (typeof value === "string") {
        obj[key] = "__PROVIDED__";
    }
}

/**
 * Removes sensitive personal information from a JSON object
 * @param {*} obj The parent JSON object that holds this element
 * @param {*} key The name of the element inside the parent JSON object
 * @param {*} value the value to be filtered
 */
function filterElements(obj, key, value) {
    // string elements with these names will have their values filtered
    let filteredKeyNames = [
        "FIRSTNAME", "LASTNAME", "SURNAME", "MIDNAME", "EMAIL", "EMAILADDRESS", "PHONE", "PHONENUMBER", "IP", "IPADDRESS", "MERCHANTCUSTOMERID", "TOKEN", "USERAGENT",
        "CARDHOLDERNAME", "CARDNUMBER"
    ];

    // objects with these names will have all of their string elements filtered
    let filteredObjectNames = ["ADDRESS", "SHIPPINGADDRESS", "BILLINGADDRESS", "PERSONALINFORMATION", "CONTACTDETAILS"];

    if (typeof value === "string") {
        if (filteredKeyNames.indexOf(key.toUpperCase()) > -1) {
            obj[key] = "__PROVIDED__";
        }
    } else if (value !== null && typeof value === "object") {
        if (filteredObjectNames.indexOf(key.toUpperCase()) > -1) {
            traverse(obj[key], filterChildStrings);
        }
    }
}

/**
 * Removes sensitive personal information from a JSON string on production instances
 * @param {*} jsonString The string to be filtered
 * @returns {string} the filtered string
 */
function filterJSONString(jsonString) {
    if (System.getInstanceType() !== System.PRODUCTION_SYSTEM) {
        return jsonString;
    }

    if (typeof jsonString === "string") {
        try {
            var json = JSON.parse(jsonString);
            traverse(json, filterElements);

            return JSON.stringify(json);
        } catch (e) {} // eslint-disable-line no-empty
    }


    return jsonString;
}

exports.filterJSONString = filterJSONString;
