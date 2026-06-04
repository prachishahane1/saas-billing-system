package com.triplixtech.saas.service;

import com.triplixtech.saas.dto.SubscriptionRequest;
import com.triplixtech.saas.entity.*;
import com.triplixtech.saas.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SubscriptionService {

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlanRepository planRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentLogRepository paymentLogRepository;

    public Subscription saveSubscription(Subscription subscription) {
        subscription.setUpdatedAt(LocalDateTime.now());
        return subscriptionRepository.save(subscription);
    }

    public List<Subscription> getAll() {
        return subscriptionRepository.findAll();
    }

    public List<Subscription> getByUser(Long userId) {
        return subscriptionRepository.findByUser_UserId(userId);
    }

    public Subscription getById(Long id) {
        return subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found"));
    }

    public void deleteSubscription(Long id) {
        subscriptionRepository.deleteById(id);
    }

    @Transactional
    public Payment subscribe(SubscriptionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Plan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        // Cancel existing ACTIVE, PENDING, or TRIAL subscriptions
        List<Subscription> existing = subscriptionRepository.findByUser_UserId(user.getUserId());
        for (Subscription sub : existing) {
            if ("ACTIVE".equals(sub.getStatus()) || "TRIAL".equals(sub.getStatus()) || "PENDING".equals(sub.getStatus())) {
                sub.setStatus("CANCELLED");
                sub.setUpdatedAt(LocalDateTime.now());
                subscriptionRepository.save(sub);
            }
        }

        // Create new subscription
        Subscription subscription = new Subscription();
        subscription.setUser(user);
        subscription.setPlan(plan);
        subscription.setStartDate(LocalDate.now());
        subscription.setBillingCycle(request.getBillingCycle() != null ? request.getBillingCycle() : "monthly");
        subscription.setAutoRenew(request.getAutoRenew() != null ? request.getAutoRenew() : true);
        subscription.setCreatedAt(LocalDateTime.now());
        subscription.setUpdatedAt(LocalDateTime.now());

        if (Boolean.TRUE.equals(request.getIsTrial())) {
            // Trial Plan Flow
            subscription.setStatus("TRIAL");
            subscription.setTrialEndDate(LocalDate.now().plusDays(14));
            subscription.setEndDate(LocalDate.now().plusDays(14));
            subscription.setRenewalDate(LocalDate.now().plusDays(14));
            subscription = subscriptionRepository.save(subscription);

            // Save dummy free payment for trial
            Payment payment = new Payment();
            payment.setUser(user);
            payment.setSubscription(subscription);
            payment.setAmount(0.0);
            payment.setStatus("SUCCESS");
            payment.setPaymentDate(LocalDateTime.now());
            payment.setCurrency(request.getCurrency() != null ? request.getCurrency() : "USD");
            payment.setPaymentGateway(request.getPaymentGateway() != null ? request.getPaymentGateway() : "STRIPE");
            payment.setTransactionId("TXN-TRIAL-" + System.currentTimeMillis());
            payment = paymentRepository.save(payment);

            PaymentLog log = new PaymentLog();
            log.setPayment(payment);
            log.setStatus("SUCCESS");
            log.setMessage("14-Day Free Trial initiated successfully");
            log.setCreatedAt(LocalDateTime.now());
            paymentLogRepository.save(log);

            return payment;
        } else {
            // Paid Plan Flow (Pending Payment)
            subscription.setStatus("PENDING");
            subscription = subscriptionRepository.save(subscription);

            Payment payment = new Payment();
            payment.setUser(user);
            payment.setSubscription(subscription);
            payment.setAmount(plan.getPrice());
            payment.setStatus("PENDING");
            payment.setPaymentDate(LocalDateTime.now());
            payment.setCurrency(request.getCurrency() != null ? request.getCurrency() : "USD");
            payment.setPaymentGateway(request.getPaymentGateway() != null ? request.getPaymentGateway() : "STRIPE");
            payment = paymentRepository.save(payment);

            PaymentLog log = new PaymentLog();
            log.setPayment(payment);
            log.setStatus("INITIATED");
            log.setMessage("Subscription initiated for plan: " + plan.getPlanName() + ", amount: " + plan.getPrice());
            log.setCreatedAt(LocalDateTime.now());
            paymentLogRepository.save(log);

            return payment;
        }
    }

    @Transactional
    public Subscription cancelSubscription(Long id) {
        Subscription subscription = getById(id);
        subscription.setStatus("CANCELLED");
        subscription.setUpdatedAt(LocalDateTime.now());
        return subscriptionRepository.save(subscription);
    }

    @Transactional
    public Payment upgradeSubscription(Long subscriptionId, Long newPlanId, String gateway, String currency) {
        Subscription current = getById(subscriptionId);
        
        SubscriptionRequest request = new SubscriptionRequest();
        request.setUserId(current.getUser().getUserId());
        request.setPlanId(newPlanId);
        request.setPaymentGateway(gateway);
        request.setCurrency(currency);
        request.setBillingCycle(current.getBillingCycle());
        request.setAutoRenew(current.getAutoRenew());
        request.setIsTrial(false);

        return subscribe(request);
    }
}