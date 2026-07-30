'use strict';

/**
 * Minimal stand-ins for dw/io/Reader and dw/io/XMLStreamReader, implementing a real
 * (if simplified) event-based tokenizer -- not a mock that just returns canned values.
 * This lets tests exercise the actual parsing logic in hipayNotificationModule.js,
 * including throwing on structurally broken XML (e.g. unterminated tags), the same
 * way the real StAX-backed dw.io.XMLStreamReader would.
 *
 * Known limitation: unlike a validating parser, this does not check that end tags
 * match their start tags -- only unterminated tags are treated as malformed.
 *
 * CHUNK_BOUNDARY is a private-use-area sentinel a test can insert into a raw XML string
 * to force a text run to be tokenized as multiple separate CHARACTERS events -- simulating
 * the real XMLStreamReader splitting one element's text across several events. The sentinel
 * itself is never included in any emitted token's text.
 *
 * Both Reader and XMLStreamReader track close() calls on their own instances, and every
 * instance created is recorded in module-level registries (see instances / resetInstances)
 * so tests can inspect exactly which instances production code created and closed.
 */
var CHUNK_BOUNDARY = 'CHUNK';

var instances = {
    readers: [],
    xmlReaders: []
};

function resetInstances() {
    instances.readers = [];
    instances.xmlReaders = [];
}

function lastReader() {
    return instances.readers[instances.readers.length - 1];
}

function lastXmlStreamReader() {
    return instances.xmlReaders[instances.xmlReaders.length - 1];
}

function Reader(text) {
    this.text = text;
    this.closed = false;
    this.closeCallCount = 0;
    instances.readers.push(this);
}
Reader.prototype.close = function () {
    this.closed = true;
    this.closeCallCount += 1;
};

function tokenize(xml) {
    var tokens = [];
    var i = 0;

    while (i < xml.length) {
        if (xml[i] === '<') {
            var end = xml.indexOf('>', i);

            if (end === -1) {
                // Deferred, like a real streaming parser: tokens up to this point are still
                // valid and returned by next(); the error only surfaces once next() actually
                // advances onto this token, not at construction time.
                tokens.push({ type: 'malformed' });
                break;
            }

            var tagContent = xml.slice(i + 1, end);

            if (tagContent[0] === '/') {
                tokens.push({ type: 'end', name: tagContent.slice(1).trim() });
            } else if (tagContent[0] === '?' || tagContent[0] === '!') {
                tokens.push({ type: 'skip' });
            } else {
                var selfClosing = tagContent[tagContent.length - 1] === '/';
                var name = (selfClosing ? tagContent.slice(0, -1) : tagContent).trim().split(/\s/)[0];

                tokens.push({ type: 'start', name: name });

                if (selfClosing) {
                    tokens.push({ type: 'end', name: name });
                }
            }

            i = end + 1;
        } else {
            var next = xml.indexOf('<', i);

            if (next === -1) {
                next = xml.length;
            }

            var text = xml.slice(i, next);

            text.split(CHUNK_BOUNDARY).forEach(function (chunk) {
                if (chunk.length) {
                    tokens.push({ type: 'text', value: chunk });
                }
            });

            i = next;
        }
    }

    return tokens;
}

function XMLStreamReader(reader) {
    this._tokens = tokenize(reader.text);
    this._pos = -1;
    this.closed = false;
    this.closeCallCount = 0;
    instances.xmlReaders.push(this);
}

XMLStreamReader.prototype.hasNext = function () {
    return this._pos + 1 < this._tokens.length;
};
XMLStreamReader.prototype.next = function () {
    this._pos += 1;

    var token = this._tokens[this._pos];

    if (token.type === 'malformed') {
        throw new Error('Malformed XML: unterminated tag');
    }

    return token;
};
XMLStreamReader.prototype.isStartElement = function () {
    return this._tokens[this._pos].type === 'start';
};
XMLStreamReader.prototype.isEndElement = function () {
    return this._tokens[this._pos].type === 'end';
};
XMLStreamReader.prototype.isCharacters = function () {
    return this._tokens[this._pos].type === 'text';
};
XMLStreamReader.prototype.getLocalName = function () {
    return this._tokens[this._pos].name;
};
XMLStreamReader.prototype.getText = function () {
    return this._tokens[this._pos].value;
};
XMLStreamReader.prototype.close = function () {
    this.closed = true;
    this.closeCallCount += 1;
};

module.exports = {
    Reader: Reader,
    XMLStreamReader: XMLStreamReader,
    CHUNK_BOUNDARY: CHUNK_BOUNDARY,
    resetInstances: resetInstances,
    lastReader: lastReader,
    lastXmlStreamReader: lastXmlStreamReader
};
