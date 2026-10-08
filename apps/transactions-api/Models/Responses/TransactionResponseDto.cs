namespace Transactions.Api.Models.Responses
{
    public class TransactionResponseDto
    {
        public string Date { get; set; }

        public MerchantDto Merchant { get; set; }
        public AmountDto Amount { get; set; }

        public string? PaymentAccount { get; set; }

        public StatusDto Status { get; set; }

        public CustomerDto Customer { get; set; }

        public string? ConfirmationCode { get; set; }
        public string? MerchantRef { get; set; }
        public string? ViewUrl { get; set; }

        public string? DeviceFingerprint { get; set; }

        public string? OrderTrackingId { get; set; }

        public string? BankAuthCode { get; set; }
    }

    public class MerchantDto
    {
        public string Name { get; set; }
        public string? Email { get; set; }
    }

    public class AmountDto
    {
        public string Full { get; set; }
        public string Currency { get; set; }
        public string Value { get; set; }
        public string? PaymentMethod { get; set; }
    }

    public class StatusDto
    {
        public string Text { get; set; }
        public string Type { get; set; }
    }

    public class CustomerDto
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? IpAddress { get; set; }
        public string ? Phone { get; set; }
    }
}
