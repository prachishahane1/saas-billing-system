package com.triplixtech.saas.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long subscriptionId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "plan_id")
    private Plan plan;

    private LocalDate startDate;

    private LocalDate trialEndDate;

    private LocalDate endDate;

    private LocalDate renewalDate;

    private String status; // ACTIVE, EXPIRED, CANCELLED, TRIAL

    private String billingCycle; // monthly / yearly

    private Boolean autoRenew;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}