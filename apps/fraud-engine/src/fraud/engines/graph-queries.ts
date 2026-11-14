/*
 * The Cypher behind the identifier network.
 *
 * Separated from GraphEngine so the same strings the engine runs can be
 * checked against a live Neo4j without instantiating the engine: see
 * database/neo4j/explain-traversal.ts, which EXPLAINs each of these in CI and
 * fails if the planner chooses a scan. Unit tests can assert on them too.
 * Keeping one copy is the point -- a query duplicated into a checking script
 * stops being the query that runs.
 */

/*
 * Only these relationships are traversed. Without naming them, any
 * relationship type added later -- a derived SIMILAR_TO, a reviewer
 * annotation, anything -- silently joins the traversal and changes what the
 * network means, with no change to this file.
 */
export const TRAVERSABLE_RELATIONSHIPS = [
  'USED_EMAIL',
  'USED_PHONE',
  'USED_IP',
  'USED_PAYMENT_ACCOUNT',
  'USED_DEVICE',
  'BELONGS_TO_MERCHANT',
] as const;

const RELATIONSHIP_PATTERN = TRAVERSABLE_RELATIONSHIPS.join('|');

/*
 * Every label this can be asked for, so the explain check can exercise each
 * one: a missing uniqueness constraint shows up as a scan for that label
 * alone.
 */
export const GRAPH_LABEL_BY_IDENTIFIER_TYPE: Record<string, string | null> = {
  email: 'Email',
  phone: 'Phone',
  ip: 'IP',
  payment_account: 'PaymentAccount',
  fingerprint: 'DeviceFingerprint',
  merchant_email: 'Merchant',
  merchant_name: 'Merchant',
  confirmation_code: null,
  order_tracking_id: null,
  bank_auth_code: null,
};

/*
 * The label is interpolated because Cypher cannot parameterise one. It is
 * always a value from GRAPH_LABEL_BY_IDENTIFIER_TYPE rather than caller
 * input, and the identifier itself is a parameter.
 *
 * Seeks the uniqueness constraint created in
 * database/neo4j/001_constraints.cypher.
 */
export function buildRootQuery(label: string): string {
  return `
    MATCH (root:${label} {value: $value})
    RETURN root, elementId(root) AS id, COUNT { (root)--() } AS degree
    LIMIT 1
  `;
}

/*
 * One breadth-first hop from the current frontier.
 *
 * `elementId(source) IN $frontier` is a seek, not a scan: Neo4j resolves it
 * with NodeByElementIdSeek. That is the one assumption in this file that
 * cannot be checked by a unit test, which is why the explain check exists.
 */
export function buildExpandQuery(): string {
  return `
    MATCH (source)
    WHERE elementId(source) IN $frontier
    MATCH (source)-[relationship:${RELATIONSHIP_PATTERN}]-(neighbour)
    RETURN relationship,
           neighbour,
           COUNT { (neighbour)--() } AS neighbourDegree
    LIMIT $rowLimit
  `;
}

/*
 * Edges among nodes already collected.
 *
 * The hop expansion only returns edges it travelled along, so two nodes found
 * at the same depth come back unconnected even when an edge joins them.
 * Those edges are the whole point of a network view: a ring is visible
 * because its members interconnect, not because they hang off one root.
 */
export function buildClosureQuery(): string {
  return `
    MATCH (a)-[relationship:${RELATIONSHIP_PATTERN}]->(b)
    WHERE elementId(a) IN $nodeIds AND elementId(b) IN $nodeIds
    RETURN relationship
    LIMIT $rowLimit
  `;
}
