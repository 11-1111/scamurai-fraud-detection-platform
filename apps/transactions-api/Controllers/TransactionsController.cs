using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Transactions.Api.Data;
using Transactions.Api.Models.Requests;
using Transactions.Api.Models.Responses;

namespace Transactions.Api.Controllers
{
    [ApiController]
    [Route("api/transactions")]
    public class TransactionsController : ControllerBase
    {
        private readonly TransactionsDbContext _db;

        public TransactionsController(TransactionsDbContext db)
        {
            _db = db;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] TransactionSearchRequest request)
        {
            var query = _db.Transactions.AsQueryable();

            if (!string.IsNullOrEmpty(request.Merchant))
                query = query.Where(x => x.MerchantName.Contains(request.Merchant));

            if (!string.IsNullOrEmpty(request.CustomerEmail))
                query = query.Where(x => x.CustomerEmail == request.CustomerEmail);

            if (!string.IsNullOrEmpty(request.Phone))
                query = query.Where(x => x.Phone == request.Phone);

            if (!string.IsNullOrEmpty(request.ConfirmationCode))
                query = query.Where(x => x.ConfirmationCode == request.ConfirmationCode);

            if (!string.IsNullOrEmpty(request.DeviceFingerprint))
                query = query.Where(x => x.DeviceFingerprint == request.DeviceFingerprint);

            if (request.DateFrom.HasValue)
                query = query.Where(x => x.TransactionDate >= request.DateFrom.Value);

            if (request.DateTo.HasValue)
                query = query.Where(x => x.TransactionDate <= request.DateTo.Value);

            var total = await query.CountAsync();

            var data = await query
                .OrderByDescending(x => x.TransactionDate)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            var response = data.Select(x => new TransactionResponseDto
            {
                Date = x.TransactionDate.ToString("yyyy/MM/dd HH:mm:ss"),
                Merchant = new MerchantDto
                {
                    Name = x.MerchantName,
                    Email = x.MerchantEmail
                },
                Amount = new AmountDto
                {
                    Currency = x.CurrencyCode,
                    Value = x.AmountValue.ToString(),
                    PaymentMethod = x.PaymentMethod,
                    Full = $"{x.CurrencyCode} {x.AmountValue:N0} {x.PaymentMethod}"
                },
                PaymentAccount = x.PaymentAccount,
                Status = new StatusDto
                {
                    Text = x.StatusText,
                    Type = x.StatusType
                },
                Customer = new CustomerDto
                {
                    Name = x.CustomerName,
                    Email = x.CustomerEmail,
                    IpAddress = x.IpAddress,
                    Phone = x.Phone
                },
                ConfirmationCode = x.ConfirmationCode,
                OrderTrackingId = x.OrderTrackingId,
                BankAuthCode = x.BankAuthCode,
                MerchantRef = x.MerchantRef,
                ViewUrl = x.ViewUrl,
                DeviceFingerprint = x.DeviceFingerprint
            });

            return Ok(new
            {
                total_transactions = total,
                transactions = response
            });
        }
    }
}
