using DateTime = System.DateTime;

namespace Transactions.Api.Models.Requests
{
    public class TransactionSearchRequest
    {
        public string? Merchant { get; set; }
        public string? CustomerEmail { get; set; }
        public string? Phone { get; set; }
        public string? ConfirmationCode { get; set; }
        public string? TrackingId { get; set; }
        public string? OrderNumber { get; set; }
        public string? BankAuth { get; set; }
        public string? DeviceFingerprint { get; set; }

        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 5;
    }
}
