# Notes

## Difference between Foreign Keys and Relations in Drizzle ORM

Foreign keys are a database level constraint, they are checked on every insert/update/delete operation and throw an error if a constraint is violated. On the other hand, relations are a higher level abstraction, they are used to define relations between tables on the application level only. They do not affect the database schema in any way and do not create foreign keys implicitly.

Link: https://orm.drizzle.team/docs/relations
Examples:

- [relations](./src/schema/relations.ts)
