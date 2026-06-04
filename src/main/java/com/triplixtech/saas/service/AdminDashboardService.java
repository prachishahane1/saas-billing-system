package com.triplixtech.saas.service;

import com.triplixtech.saas.dto.AdminDashboardMetrics;
import com.triplixtech.saas.entity.Payment;
import com.triplixtech.saas.entity.Subscription;
import com.triplixtech.saas.repository.OrganizationRepository;
import com.triplixtech.saas.repository.PaymentRepository;
import com.triplixtech.saas.repository.SubscriptionRepository;
import com.triplixtech.saas.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminDashboardService {

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    public AdminDashboardMetrics getMetrics() {
        Long totalOrgs = organizationRepository.count();
        Long totalUsers = userRepository.count();

        List<Subscription> subscriptions = subscriptionRepository.findAll();
        Long activeSubs = subscriptions.stream()
                .filter(s -> "ACTIVE".equals(s.getStatus()) || "TRIAL".equals(s.getStatus()))
                .count();
        Long expiredSubs = subscriptions.stream()
                .filter(s -> "EXPIRED".equals(s.getStatus()) || "CANCELLED".equals(s.getStatus()))
                .count();

        List<Payment> payments = paymentRepository.findAll();
        Long failedPayments = payments.stream()
                .filter(p -> "FAILED".equals(p.getStatus()))
                .count();

        // Compute current month revenue
        LocalDateTime firstDayOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        Double monthlyRevenue = payments.stream()
                .filter(p -> "SUCCESS".equals(p.getStatus()) && p.getPaymentDate().isAfter(firstDayOfMonth))
                .mapToDouble(Payment::getAmount)
                .sum();

        // Sort payments by date desc for recent list
        List<Payment> recent = payments.stream()
                .sorted((p1, p2) -> p2.getPaymentDate().compareTo(p1.getPaymentDate()))
                .limit(10)
                .collect(Collectors.toList());

        // Group revenue by month
        Map<String, Double> revenueByMonth = new LinkedHashMap<>();
        // Pre-fill last 6 months
        for (int i = 5; i >= 0; i--) {
            LocalDateTime monthDate = LocalDateTime.now().minusMonths(i);
            String monthName = monthDate.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            revenueByMonth.put(monthName, 0.0);
        }

        for (Payment p : payments) {
            if ("SUCCESS".equals(p.getStatus())) {
                String monthName = p.getPaymentDate().getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
                if (revenueByMonth.containsKey(monthName)) {
                    revenueByMonth.put(monthName, revenueByMonth.get(monthName) + p.getAmount());
                }
            }
        }

        return new AdminDashboardMetrics(
                totalOrgs,
                totalUsers,
                activeSubs,
                expiredSubs,
                monthlyRevenue,
                failedPayments,
                recent,
                revenueByMonth
        );
    }
}
