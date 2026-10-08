import { IngestionService } from './ingestion.service';

describe('IngestionService entry points', () => {
  let service: IngestionService;
  let runIngestionMock: jest.Mock;

  beforeEach(() => {
    service = new IngestionService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    runIngestionMock = jest.fn().mockResolvedValue({
      ingested: 0,
      message: 'No new transactions found',
    });
    jest.spyOn(service, 'runIngestion').mockImplementation(runIngestionMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runManualSync() delegates to runIngestion()', async () => {
    const result = await service.runManualSync();

    expect(runIngestionMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ingested: 0,
      message: 'No new transactions found',
    });
  });

  it('runScheduledSync() delegates to runIngestion()', async () => {
    const result = await service.runScheduledSync();

    expect(runIngestionMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ingested: 0,
      message: 'No new transactions found',
    });
  });
});
