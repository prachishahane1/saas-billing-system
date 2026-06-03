package com.triplixtech.saas.repository;

import com.triplixtech.saas.entity.PaymentLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentLogRepository extends JpaRepository<PaymentLog, Long> {

    List<PaymentLog> findByPayment_PaymentId(Long paymentId);
}