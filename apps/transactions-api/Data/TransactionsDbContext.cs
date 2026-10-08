using Microsoft.EntityFrameworkCore;
using Transactions.Api.Models;

namespace Transactions.Api.Data
{
    public class TransactionsDbContext : DbContext
    {
        public TransactionsDbContext(DbContextOptions<TransactionsDbContext> options)
            : base(options) { }

        public DbSet<TransactionEntity> Transactions { get; set; }
    }
}
