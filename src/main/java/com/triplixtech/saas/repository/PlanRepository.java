package com.triplixtech.saas.repository;

import com.triplixtech.saas.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<Plan, Long> {
}