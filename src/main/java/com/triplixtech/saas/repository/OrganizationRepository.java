package com.triplixtech.saas.repository;

import com.triplixtech.saas.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository
        extends JpaRepository<Organization, Long> {
}