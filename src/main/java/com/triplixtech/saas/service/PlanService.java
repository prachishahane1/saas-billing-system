package com.triplixtech.saas.service;

import com.triplixtech.saas.entity.Plan;
import com.triplixtech.saas.repository.PlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlanService {

    @Autowired
    private PlanRepository planRepository;

    public Plan savePlan(Plan plan){
        return planRepository.save(plan);
    }

    public List<Plan> getAllPlans(){
        return planRepository.findAll();
    }

    public Plan getById(Long id){
        return planRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found"));
    }
}