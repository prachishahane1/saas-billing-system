package com.triplixtech.saas.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long planId;

    private String planName;

    private String planType; // Free, Starter, Pro

    private Double price;

    private String duration; // monthly / yearly

    @Column(columnDefinition = "TEXT")
    private String features; // Comma separated or description list

    private LocalDateTime createdAt;
}