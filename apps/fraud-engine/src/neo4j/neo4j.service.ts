import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';

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

  async run(query: string, params: Record<string, unknown> = {}) {
    const session = this.driver.session();

    try {
      const result = await session.run(query, params);
      return result.records;
    } finally {
      await session.close();
    }
  }

  async onApplicationShutdown() {
    await this.driver.close();
  }
}
