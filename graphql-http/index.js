import cluster from "cluster";
import { cpus } from "os";
import http from "node:http";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  parse,
  validate,
} from "graphql";
import { createHandler } from "graphql-http/lib/use/node";

if (cluster.isPrimary) {
  for (let i = 0; i < cpus().length; i++) {
    cluster.fork();
  }
} else {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        hello: {
          type: GraphQLString,
          resolve: () => "world",
        },
      },
    }),
  });

  const parseCache = {};
  const validateCache = new WeakMap();

  const server = http.createServer(
    createHandler({
      schema,
      parse(source) {
        let doc = parseCache[source];
        if (!doc) {
          doc = parseCache[source] = parse(source);
        }
        return doc;
      },
      validate: (schema, doc) => {
        let errs = validateCache.get(doc);
        if (!errs) {
          errs = validate(schema, doc);
          validateCache.set(doc, errs);
        }
        return errs;
      },
    })
  );

  server.listen(8000);
}
