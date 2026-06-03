package com.triplixtech.saas.repository;

import com.triplixtech.saas.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findBySubscription_SubscriptionId(Long subscriptionId);
}