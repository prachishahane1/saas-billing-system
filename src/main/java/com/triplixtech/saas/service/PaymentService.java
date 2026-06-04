package com.triplixtech.saas.service;

import com.triplixtech.saas.entity.*;
import com.triplixtech.saas.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private PaymentLogRepository paymentLogRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    public Payment savePayment(Payment payment) {
        return paymentRepository.save(payment);
    }

    public List<Payment> getAll() {
        return paymentRepository.findAll();
    }

    public List<Payment> getByUser(Long userId) {
        return paymentRepository.findByUser_UserId(userId);
    }

    public List<Payment> getBySubscription(Long subId) {
        return paymentRepository.findBySubscription_SubscriptionId(subId);
    }

    public Payment getById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
    }

    @Transactional
    public Payment completePayment(Long paymentId) {
        Payment payment = getById(paymentId);
        if (!"PENDING".equals(payment.getStatus())) {
            throw new RuntimeException("Payment is already in status: " + payment.getStatus());
        }

        // Update Payment status to SUCCESS
        payment.setStatus("SUCCESS");
        payment.setPaymentDate(LocalDateTime.now());
        payment.setTransactionId("TXN-" + System.currentTimeMillis());
        payment = paymentRepository.save(payment);

        // Update Subscription status to ACTIVE
        Subscription sub = payment.getSubscription();
        LocalDate today = LocalDate.now();
        sub.setStartDate(today);

        LocalDate endDate;
        String duration = sub.getPlan().getDuration();
        if (duration != null && (duration.toLowerCase().contains("year") || duration.toLowerCase().contains("annual"))) {
            endDate = today.plusYears(1);
        } else {
            endDate = today.plusMonths(1);
        }
        sub.setEndDate(endDate);
        sub.setRenewalDate(endDate);
        sub.setStatus("ACTIVE");
        sub.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(sub);

        // Log payment success
        PaymentLog log = new PaymentLog();
        log.setPayment(payment);
        log.setStatus("SUCCESS");
        log.setMessage("Payment processed successfully via " + payment.getPaymentGateway());
        log.setCreatedAt(LocalDateTime.now());
        paymentLogRepository.save(log);

        // Generate Invoice
        Invoice invoice = new Invoice();
        invoice.setUser(payment.getUser());
        invoice.setPayment(payment);
        invoice.setSubscription(sub);
        invoice.setAmount(payment.getAmount());
        invoice.setGeneratedDate(LocalDateTime.now());
        invoice.setInvoiceStatus("PAID");

        String invoiceNum = "INV-" + DateTimeFormatter.ofPattern("yyyyMMdd").format(LocalDate.now()) + "-" + paymentId;
        invoice.setInvoiceNumber(invoiceNum);
        invoiceRepository.save(invoice);

        return payment;
    }

    @Transactional
    public Payment failPayment(Long paymentId, String reason) {
        Payment payment = getById(paymentId);
        if (!"PENDING".equals(payment.getStatus())) {
            throw new RuntimeException("Payment is already in status: " + payment.getStatus());
        }

        payment.setStatus("FAILED");
        payment.setFailureReason(reason != null ? reason : "Transaction declined by gateway");
        payment = paymentRepository.save(payment);

        Subscription sub = payment.getSubscription();
        sub.setStatus("CANCELLED");
        sub.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(sub);

        PaymentLog log = new PaymentLog();
        log.setPayment(payment);
        log.setStatus("FAILED");
        log.setMessage("Payment failed: " + payment.getFailureReason());
        log.setCreatedAt(LocalDateTime.now());
        paymentLogRepository.save(log);

        return payment;
    }

    @Transactional
    public Payment refundPayment(Long paymentId) {
        Payment payment = getById(paymentId);
        if (!"SUCCESS".equals(payment.getStatus())) {
            throw new RuntimeException("Cannot refund payment in status: " + payment.getStatus());
        }

        payment.setStatus("REFUNDED");
        payment = paymentRepository.save(payment);

        Subscription sub = payment.getSubscription();
        sub.setStatus("CANCELLED");
        sub.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(sub);

        // Update Invoices associated
        List<Invoice> invoices = invoiceRepository.findByPayment_PaymentId(paymentId);
        for (Invoice invoice : invoices) {
            invoice.setInvoiceStatus("VOID");
            invoiceRepository.save(invoice);
        }

        PaymentLog log = new PaymentLog();
        log.setPayment(payment);
        log.setStatus("REFUNDED");
        log.setMessage("Payment has been refunded successfully.");
        log.setCreatedAt(LocalDateTime.now());
        paymentLogRepository.save(log);

        return payment;
    }
}