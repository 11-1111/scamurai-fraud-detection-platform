using Microsoft.EntityFrameworkCore;
using Transactions.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register DB Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    // Without this the failure surfaces as an ArgumentNullException from deep
    // inside EF Core, which says nothing about what is missing or where to
    // set it. Supply it as ConnectionStrings__DefaultConnection in the
    // environment, or in appsettings.Development.json for local work.
    throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is not configured. Set " +
        "ConnectionStrings__DefaultConnection in the environment, or add it " +
        "to appsettings.Development.json for local development."
    );
}

builder.Services.AddDbContext<TransactionsDbContext>(options =>
    options.UseSqlServer(connectionString)
);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
