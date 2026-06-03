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
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    private Double amount;

    private String method; // UPI, CARD, NETBANKING

    private String status; // SUCCESS, FAILED, PENDING

    private LocalDateTime paymentDate;
}