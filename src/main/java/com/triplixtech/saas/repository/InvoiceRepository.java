package com.triplixtech.saas.repository;

import com.triplixtech.saas.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByPayment_PaymentId(Long paymentId);

    List<Invoice> findByUser_UserId(Long userId);

    List<Invoice> findBySubscription_SubscriptionId(Long subscriptionId);
}