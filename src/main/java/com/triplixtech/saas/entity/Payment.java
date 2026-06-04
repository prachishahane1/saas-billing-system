package com.triplixtech.saas.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long paymentId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    private Double amount;

    private LocalDateTime paymentDate;

    private String status; // SUCCESS, FAILED, PENDING, REFUNDED

    private String currency; // USD, INR

    private String transactionId;

    private String paymentGateway; // STRIPE, PAYPAL, RAZORPAY

    private String failureReason;
}