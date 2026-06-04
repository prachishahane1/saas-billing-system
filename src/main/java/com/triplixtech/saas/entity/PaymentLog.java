package com.triplixtech.saas.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PaymentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long logId;

    @ManyToOne
    @JoinColumn(name = "payment_id")
    private Payment payment;

    private String status; // INITIATED, SUCCESS, FAILED, REFUNDED

    private String message;

    private LocalDateTime createdAt;
}