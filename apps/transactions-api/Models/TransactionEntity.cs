using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Transactions.Api.Models
{
    [Table("Transactions")]
    public class TransactionEntity
    {
        [Key]
        public Guid Id { get; set; }

        public DateTime TransactionDate { get; set; }

        public string MerchantName { get; set; } = null!;
        public string? MerchantEmail { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AmountValue { get; set; }

        public string CurrencyCode { get; set; } = null!;
        public string? PaymentMethod { get; set; }

        public string? PaymentAccount { get; set; }
        public string? BankAuthCode { get; set; }

        public string StatusText { get; set; } = null!;
        public string StatusType { get; set; } = null!;

        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? IpAddress { get; set; }
        public string? Phone { get; set; }

        public string? ConfirmationCode { get; set; }
        public string? MerchantRef { get; set; }
        public string? OrderTrackingId { get; set; }

        public string? DeviceFingerprint { get; set; }

        [NotMapped]
        public string? ViewUrl { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}