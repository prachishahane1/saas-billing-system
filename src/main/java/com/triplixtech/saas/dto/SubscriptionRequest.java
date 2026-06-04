package com.triplixtech.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionRequest {
    private Long userId;
    private Long planId;
    private String paymentGateway; // STRIPE, PAYPAL, RAZORPAY
    private String currency; // USD, INR
    private String billingCycle; // monthly, yearly
    private Boolean autoRenew;
    private Boolean isTrial; // If true, start a 14-day trial
}
