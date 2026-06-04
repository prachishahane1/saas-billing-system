package com.triplixtech.saas.dto;

import com.triplixtech.saas.entity.Payment;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardMetrics {
    private Long totalOrganizations;
    private Long totalUsers;
    private Long activeSubscriptions;
    private Long expiredSubscriptions;
    private Double monthlyRevenue;
    private Long failedPayments;
    private List<Payment> recentTransactions;
    private Map<String, Double> revenueByMonth;
}
