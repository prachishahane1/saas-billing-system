package com.triplixtech.saas.repository;

import com.triplixtech.saas.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    List<Subscription> findByUser_UserId(Long userId);
}