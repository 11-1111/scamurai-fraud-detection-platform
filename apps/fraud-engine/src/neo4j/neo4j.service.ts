import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';

/*
 * The driver's own TransactionConfig is exported from neo4j-driver-core, a
 * transitive dependency. Naming the two fields used here keeps the import
 * list to direct dependencies; session.run accepts it structurally.
 */
export interface Neo4jQueryConfig {
  /** Server-side query timeout in milliseconds. */
  timeout?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class Neo4jService implements OnApplicationShutdown {
  private readonly driver: Driver;

  constructor(private readonly config: ConfigService) {
    this.driver = neo4j.driver(
      this.config.get<string>('NEO4J_URI')!,
      neo4j.auth.basic(
        this.config.get<string>('NEO4J_USER')!,
        this.config.get<string>('NEO4J_PASSWORD')!,
      ),
    );
  }

  /*
   * `timeout` is enforced by the server, not by this process: Neo4j
   * terminates the query itself. A client-side race against a promise would
   * leave the query running and the connection occupied, which is the
   * failure mode worth avoiding under load.
   */
  async run(
    query: string,
    params: Record<string, unknown> = {},
    config: Neo4jQueryConfig = {},
  ) {
    const session = this.driver.session();

    try {
      const result = await session.run(query, params, config);
      return result.records;
    } finally {
      await session.close();
    }
  }

  async onApplicationShutdown() {
    await this.driver.close();
  }
}
