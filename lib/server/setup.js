import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { createGraphQLMethod } from './createGraphQLMethod';
import { createGraphQLPublication } from './createGraphQLPublication';
import { createGraphQLMiddleware } from './createGraphQLMiddleware';
import { meteorAuthMiddleware } from './meteorAuthMiddleware';
import {
  DEFAULT_METHOD,
  DEFAULT_PATH,
} from '../common/defaults';

export const DDP_APOLLO_SCHEMA_REQUIRED = 'DDP_APOLLO_SCHEMA_REQUIRED';

export function setup({
  schema,
  method = DEFAULT_METHOD,
  publication,
  context,
} = {}) {
  if (!schema) {
    throw new Error(DDP_APOLLO_SCHEMA_REQUIRED);
  }

  Meteor.methods({
    [method]: createGraphQLMethod({
      schema,
      context,
    }),
  });

  createGraphQLPublication({
    schema,
    publication,
    context,
  });
}

export function setupHttpEndpoint({
  schema,
  path = DEFAULT_PATH,
  context,
  engine,
  jsonParser,
  authMiddleware = meteorAuthMiddleware,
} = {}) {
  if (!schema) {
    throw new Error(DDP_APOLLO_SCHEMA_REQUIRED);
  }

  const graphQLMiddleware = createGraphQLMiddleware({
    schema,
    context,
  });

  if (engine && engine.expressMiddleware) {
    WebApp.connectHandlers.use(engine.expressMiddleware());
  }

  if (!jsonParser) {
    // Only require the body-parser for users who actually use the http version
    // eslint-disable-next-line global-require
    const bodyParser = require('body-parser');
    // eslint-disable-next-line no-param-reassign
    jsonParser = bodyParser.json();
  }

  WebApp.connectHandlers.use(path, jsonParser);

  if (authMiddleware) {
    WebApp.connectHandlers.use(path, authMiddleware);
  }

  WebApp.connectHandlers.use(path, (req, res, next) => graphQLMiddleware(req, res).catch(next));
}
