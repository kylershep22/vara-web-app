const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
const { Blob, File } = require('node:buffer');
const { MessagePort, MessageChannel, BroadcastChannel } = require('node:worker_threads');

if (!globalThis.DOMException) {
  globalThis.DOMException = class DOMException extends Error {
    constructor(message, name = 'Error') {
      super(message);
      this.name = name;
      this.code = 0;
    }
  };
}

if (!globalThis.ReadableStream) globalThis.ReadableStream = ReadableStream;
if (!globalThis.WritableStream) globalThis.WritableStream = WritableStream;
if (!globalThis.TransformStream) globalThis.TransformStream = TransformStream;
if (!globalThis.Blob) globalThis.Blob = Blob;
if (!globalThis.File && File) globalThis.File = File;
if (!globalThis.MessagePort) globalThis.MessagePort = MessagePort;
if (!globalThis.MessageChannel) globalThis.MessageChannel = MessageChannel;
if (!globalThis.BroadcastChannel) globalThis.BroadcastChannel = BroadcastChannel;

const { fetch, Headers, Request, Response, FormData } = require('undici');

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.FormData = FormData;
}
