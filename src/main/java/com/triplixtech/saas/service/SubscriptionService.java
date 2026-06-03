package com.triplixtech.saas.service;

import com.triplixtech.saas.entity.Subscription;
import com.triplixtech.saas.repository.SubscriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SubscriptionService {

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    public Subscription saveSubscription(Subscription subscription){
        return subscriptionRepository.save(subscription);
    }

    public List<Subscription> getAll(){
        return subscriptionRepository.findAll();
    }

    public List<Subscription> getByOrganization(Long orgId){
        return subscriptionRepository.findByOrganization_OrganizationId(orgId);
    }

    public Subscription getById(Long id){
        return subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found"));
    }
}