#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SeedWorldDirector.generated.h"

class UProceduralMeshComponent;
class UInstancedStaticMeshComponent;
class ASeedResident;

USTRUCT()
struct FSeedSettlement
{
    GENERATED_BODY()

    FVector Location = FVector::ZeroVector;
    FLinearColor Culture = FLinearColor::White;
    int32 Deliveries = 0;
    int32 HouseCount = 0;
    int32 NextHouseAt = 7;
};

/**
 * Generates terrain, vegetation, resources, residents, settlements, and houses from a single seed.
 * The terrain is geometry; the houses are built only after resident material deliveries.
 */
UCLASS()
class SEEDGENESIS_API ASeedWorldDirector : public AActor
{
    GENERATED_BODY()

public:
    ASeedWorldDirector();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;

    float GetGroundHeight(float X, float Y) const;
    FVector GetSettlementLocation(int32 SettlementIndex) const;
    FVector GetResourceLocation(int32 ResourceIndex) const;
    int32 GetResourceCount() const;
    void ReceiveMaterial(int32 SettlementIndex, const FLinearColor& MaterialPigment);

private:
    void BuildTerrain();
    void BuildBiome();
    void PopulateWorld();
    void AddHouse(int32 SettlementIndex, const FLinearColor& Pigment);
    void AddTree(const FVector& Location, float Scale, int32 Variant);
    float SiteHeight(float X, float Y) const;

    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UProceduralMeshComponent> Terrain;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UInstancedStaticMeshComponent> Trunks;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UInstancedStaticMeshComponent> CanopyA;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UInstancedStaticMeshComponent> CanopyB;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UInstancedStaticMeshComponent> ResourceMarkers;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UInstancedStaticMeshComponent> HouseWalls;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UInstancedStaticMeshComponent> HouseRoofs;

    UPROPERTY()
    TArray<TObjectPtr<ASeedResident>> Residents;

    TArray<FSeedSettlement> Settlements;
    TArray<FVector> ResourceLocations;
    FRandomStream Random;
    float BuildPulse = 0.f;
    int32 WorldSeed = 260716;
};
